import { describe, it, expect, vi, afterEach } from 'vitest';
import { planService } from './planService';
import { apiClient } from './apiClient';

const mockGet = vi.spyOn(apiClient, 'get');

afterEach(() => {
  mockGet.mockReset();
});

describe('planService facade integration', () => {
  it('maps plan list from facade payload', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          plans: [
            {
              id: 'plan-1',
              name: 'Quarterly Bonus',
              version: 2,
              status: 'draft',
              created_at: '2025-01-01T00:00:00Z',
              created_by: 'analyst@test.com',
              plan_metadata: { description: 'Baseline bonus plan', tags: ['baseline'] },
              steps: [
                {
                  id: 'step-1',
                  name: 'Base bonus',
                  expr: 'base_salary * 0.1',
                  outputs: ['base_bonus'],
                  step_order: 1,
                },
              ],
              inputs: [
                {
                  id: 'input-1',
                  input_id: 'base_salary',
                  required: true,
                  source_mapping: {},
                },
              ],
            },
          ],
        },
      },
    } as any);

    const result = await planService.getPlans();

    expect(mockGet).toHaveBeenCalledWith('/api/v1/plans?page=1&pageSize=20');
    expect(result.plans).toHaveLength(1);
    const mapped = result.plans[0];
    expect(mapped.name).toBe('Quarterly Bonus');
    expect(mapped.structure.calculations).toHaveLength(1);
    expect(mapped.structure.fields[0]?.name).toBe('base_salary');
    expect(mapped.tags).toContain('baseline');
  });

  it('fetches a single plan with steps and inputs', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          plan: {
            id: 'plan-2',
            name: 'Manager Bonus',
            version: 1,
            status: 'approved',
            created_at: '2025-01-05T00:00:00Z',
            created_by: 'admin@test.com',
            plan_metadata: { description: 'Management bonus' },
            steps: [],
            inputs: [],
          },
        },
      },
    } as any);

    const plan = await planService.getPlan('plan-2');

    expect(mockGet).toHaveBeenCalledWith('/api/v1/plans/plan-2', {
      params: { include_steps: true, include_inputs: true },
    });
    expect(plan.id).toBe('plan-2');
    expect(plan.status).toBe('active');
    expect(plan.structure.calculations).toHaveLength(0);
  });
});
