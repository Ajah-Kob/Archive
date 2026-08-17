import { render, screen } from '@testing-library/react'
import { SubmissionHistory } from './SubmissionHistory'

describe('components/milestones/chapter/SubmissionHistory.tsx', () => {
  test('renders empty state', () => {
    render(<SubmissionHistory history={[]} />)
    expect(screen.getByText('No Submission History')).toBeDefined()
  })
})
