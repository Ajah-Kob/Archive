import { render, screen } from '@testing-library/react'
import { UploadDropzone } from './UploadDropzone'

describe('components/milestones/chapter/UploadDropzone.tsx', () => {
  test('renders prompt text', () => {
    render(<UploadDropzone onFileSelect={() => {}} />)
    expect(screen.getByText('Drag and drop your document here')).toBeDefined()
  })
})
