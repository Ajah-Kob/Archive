import { render } from '@testing-library/react'
import { StatusCallout } from './StatusCallout'

describe('components/milestones/chapter/StatusCallout.tsx', () => {
  test('renders correctly for APPROVED status', () => {
    const { getByText } = render(<StatusCallout status="APPROVED" message="Approved!" />)
    expect(getByText('Submission approved')).toBeDefined()
    expect(getByText('Approved!')).toBeDefined()
  })
})
