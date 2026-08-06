"use server"

import prisma from "@/lib/prisma"
import { hash } from "bcrypt"
import { revalidateTag, revalidatePath } from "next/cache"
import { cacheLife, cacheTag } from "next/cache"
import { USERS_PER_PAGE } from "@/config/constants"
import { isValidEmail } from "@/lib/helper"
import { requireAdmin, requireUser, sanitizeUser, sanitizeUsers } from "@/lib/actions/guard"

const table = "user"
const MIN_PASSWORD_LENGTH = 8
const VALID_ROLES = ["SUPERADMIN", "ADMIN", "FACULTY", "STUDENT", "GUEST"]

// GET ONE
async function getUserData(id: string) {
  'use cache'
  cacheTag('users')
  cacheLife('seconds')

  try {
    const user = await prisma[table].findFirst({ where: { id: +id, deletedAt: null } })
    return { success: true, payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to get user" }
  }
}

export async function getUser(id: string) {
  // Any signed-in user reaching an admin surface; page-level guards still apply.
  if (!(await requireUser())) return { success: false, payload: null, message: "Not authorized" }
  return getUserData(id)
}

// GET ALL (paginated, filterable, sortable)
async function getUsersData(
  page: number,
  perPage: number,
  search?: string,
  roleFilter?: string,
  dateFrom?: string,
  dateTo?: string,
  sortField?: string,
  sortDir?: string,
) {
  'use cache'
  cacheTag('users')
  cacheLife('seconds')

  try {
    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }
    if (roleFilter) {
      where.role = roleFilter
    }
    if (dateFrom) {
      where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) }
    }
    if (dateTo) {
      where.createdAt = { ...where.createdAt, lte: new Date(dateTo + "T23:59:59.999Z") }
    }

    const orderBy: any = {}
    if (sortField === "chair") {
      orderBy.faculty = { isProgramChair: sortDir === "desc" ? "desc" : "asc" }
    } else if (sortField && ["id", "name", "email", "role", "createdAt"].includes(sortField)) {
      orderBy[sortField] = sortDir === "desc" ? "desc" : "asc"
    } else {
      orderBy.id = "asc"
    }

    const skip = (page - 1) * perPage
    const [users, total] = await prisma.$transaction([
      prisma[table].findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: { faculty: { select: { isProgramChair: true } } },
      }),
      prisma[table].count({ where }),
    ])
    return {
      success: true,
      payload: sanitizeUsers(users),
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    }
  } catch {
    return { success: false, payload: null, total: 0, totalPages: 1, message: "Failed to get users" }
  }
}

export async function getUsers(
  page: number = 1,
  perPage: number = USERS_PER_PAGE,
  search?: string,
  roleFilter?: string,
  dateFrom?: string,
  dateTo?: string,
  sortField?: string,
  sortDir?: string,
) {
  if (!(await requireAdmin())) return { success: false, payload: null, total: 0, totalPages: 1, message: "Not authorized" }
  return getUsersData(page, perPage, search, roleFilter, dateFrom, dateTo, sortField, sortDir)
}

// SIGNUP (public) — always creates a plain USER; never reads a role from input.
export async function signupUser(_prevState: any, formData: FormData) {
  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString().trim()
  const confirmPassword = formData.get("confirmPassword")?.toString().trim()

  const errors: Record<string, string> = {}
  if (!name) errors.name = "Name is required."
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."
  if (!password) errors.password = "Password is required."
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
  if (!confirmPassword) errors.confirmPassword = "Please confirm your password."
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match."

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { name, email } }
  }

  return persistNewUser({ name: name!, email: email!, password: password!, role: "GUEST" })
}

// CREATE (admin only) — may assign a role.
export async function createUser(_prevState: any, formData: FormData) {
  if (!(await requireAdmin())) {
    return { success: false, message: "You are not authorized to perform this action." }
  }

  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString().trim()
  const role = formData.get("role")?.toString().trim() || "GUEST"
  const safeRole = VALID_ROLES.includes(role) ? role : "GUEST"

  const errors: Record<string, string> = {}
  if (!name) errors.name = "Name is required."
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."
  if (!password) errors.password = "Password is required."
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { name, email } }
  }

  return persistNewUser({ name: name!, email: email!, password: password!, role: safeRole })
}

// Shared insert path for signup + admin create.
async function persistNewUser(data: { name: string; email: string; password: string; role: string }) {
  try {
    const userExist = await prisma[table].findFirst({ where: { email: data.email } })
    if (userExist) {
      return {
        success: false,
        message: [`Email ${data.email} already exists.`],
        input: { name: data.name, email: data.email },
      }
    }

    const user = await prisma[table].create({
      data: {
        name: data.name,
        email: data.email,
        password: await hash(data.password, 12),
        role: data.role as any,
      },
    })

    revalidateTag("users", "max")
    revalidatePath("/dashboard/users")

    return { success: true, message: "User created successfully", payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to create user" }
  }
}

// SOFT DELETE (admin only)
export async function softDeleteUser(id: string) {
  const session = await requireAdmin()
  if (!session) {
    return { success: false, payload: null, message: "You are not authorized to perform this action." }
  }

  const targetId = parseInt(id)
  if (Number.isNaN(targetId)) {
    return { success: false, payload: null, message: "Invalid user id." }
  }

  // Cannot delete yourself.
  if (String(targetId) === String(session.user.id)) {
    return { success: false, payload: null, message: "You cannot delete your own account." }
  }

  try {
    const target = await prisma[table].findFirst({ where: { id: targetId, deletedAt: null } })
    if (!target) {
      return { success: false, payload: null, message: "User not found." }
    }

    // Only a SUPERADMIN may delete another SUPERADMIN.
    if (target.role === "SUPERADMIN" && session.user.role !== "SUPERADMIN") {
      return { success: false, payload: null, message: "You cannot delete a superadmin." }
    }

    const user = await prisma[table].update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    })

    revalidateTag("users", "max")
    revalidatePath("/dashboard/users")

    return { success: true, payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to delete user" }
  }
}

// UPDATE (admin only)
export async function updateUser(_prevState: any, formData: FormData) {
  const session = await requireAdmin()
  if (!session) {
    return { success: false, message: "You are not authorized to perform this action." }
  }

  const id = formData.get("id")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()
  const role = formData.get("role")?.toString().trim() || "GUEST"
  const safeRole = VALID_ROLES.includes(role) ? role : "GUEST"

  const errors: Record<string, string> = {}
  if (!name) errors.name = "Name is required."
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { id, name, email, role } }
  }

  const targetId = parseInt(id!)
  if (Number.isNaN(targetId)) {
    return { success: false, message: "Invalid user id.", input: { id, name, email, role } }
  }

  try {
    const target = await prisma[table].findFirst({ where: { id: targetId, deletedAt: null } })
    if (!target) {
      return { success: false, message: "User not found.", input: { id, name, email, role } }
    }

    // Only a SUPERADMIN may change another SUPERADMIN or grant SUPERADMIN.
    if (
      session.user.role !== "SUPERADMIN" &&
      (target.role === "SUPERADMIN" || safeRole === "SUPERADMIN")
    ) {
      return { success: false, message: "You cannot modify superadmin roles.", input: { id, name, email, role } }
    }

    const userExist = await prisma[table].findFirst({
      where: { email, NOT: { id: targetId } },
    })
    if (userExist) {
      return {
        success: false,
        message: `Email ${email} is already in use.`,
        input: { id, name, email, role },
      }
    }

    const user = await prisma[table].update({
      where: { id: targetId },
      data: { name, email, role: safeRole as any, updatedAt: new Date() },
    })

    revalidateTag("users", "max")
    revalidatePath("/dashboard/users")

    return { success: true, message: "User updated successfully.", payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to update user." }
  }
}
