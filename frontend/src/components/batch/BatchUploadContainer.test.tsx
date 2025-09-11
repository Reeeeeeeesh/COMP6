import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { BatchUploadContainer } from './BatchUploadContainer'
import { UserContextProvider } from '../../contexts/UserContext'
import { TenantContextProvider } from '../../contexts/TenantContext'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <TenantContextProvider>
        <UserContextProvider>
          {ui}
        </UserContextProvider>
      </TenantContextProvider>
    </MemoryRouter>
  )
}

describe('BatchUploadContainer wizard', () => {
  it('shows the FileUpload section and clicking the Upload step keeps it visible', async () => {
    renderWithProviders(<BatchUploadContainer sessionId="test-session" />)

    // First step label should be visible
    const stepLabel = await screen.findByText('File Upload & Validation')
    expect(stepLabel).toBeInTheDocument()

    // The upload UI should already be visible for the initial step
    expect(screen.getByText('Upload Your CSV File')).toBeInTheDocument()

    // Clicking the step should keep (or re-show) the upload UI
    await userEvent.click(stepLabel)
    expect(screen.getByText('Upload Your CSV File')).toBeInTheDocument()
  })

  it('advances to Intelligent Column Mapping after a successful upload and renders the mapping UI', async () => {
    const user = userEvent.setup()

    // Mock global fetch for upload, columns, and mapping endpoints
    const realFetch = global.fetch
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      // Upload endpoint
      if (url.includes('/api/v1/batch/file') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            data: { upload: { id: 'upload-1' } },
            message: 'ok'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ) as any
      }
      // Columns endpoint
      if (url.includes('/api/v1/batch/uploads/upload-1/columns') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              upload_id: 'upload-1',
              columns: [
                { name: 'Emp ID', data_type: 'string', sample_values: ['E1','E2'], has_data: true },
                { name: 'Base Pay', data_type: 'float', sample_values: ['100000','95000'], has_data: true }
              ],
              sample_data: [],
              total_rows: 2,
              processed_rows: 2,
              failed_rows: 0,
              status: 'uploaded'
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ) as any
      }
      // System fields
      if (url.includes('/api/v1/column-mapping/system-fields') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              employee_id: { description: 'Unique employee id', aliases: [], expected_type: ['string'], required: true },
              base_salary: { description: 'Base salary', aliases: [], expected_type: ['float'], required: true },
              department: { description: 'Dept', aliases: [], expected_type: ['string'], required: false }
            },
            message: 'ok'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ) as any
      }
      // Analyze mapping
      if (url.includes('/api/v1/column-mapping/analyze') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            suggestions: [],
            required_fields_coverage: { employee_id: 'Emp ID', base_salary: 'Base Pay' },
            unmapped_csv_columns: [],
            confidence_score: 0.9,
            recommended_mapping: { 'Emp ID': 'employee_id', 'Base Pay': 'base_salary' }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ) as any
      }
      return new Response('Not Found', { status: 404 }) as any
    })

    try {
      renderWithProviders(<BatchUploadContainer sessionId="test-session" />)

      // The upload UI is visible initially
      expect(await screen.findByText('Upload Your CSV File')).toBeInTheDocument()

      // Select a fake file via the hidden input by clicking the "browse to upload" button text
      const browseBtn = screen.getByRole('button', { name: /browse to upload/i })
      await user.click(browseBtn)

      // Programmatically trigger the input change with a File
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["id,amount\n1,100\n"], 'test.csv', { type: 'text/csv' })
      // Dispatch change event
      Object.defineProperty(input, 'files', { value: [file] })
      input.dispatchEvent(new Event('change', { bubbles: true }))

      // After upload + columns fetch, the wizard should advance to mapping
      expect(await screen.findByText('Intelligent Column Mapping')).toBeInTheDocument()
    } finally {
      // Restore fetch
      global.fetch = realFetch
    }
  })
})
