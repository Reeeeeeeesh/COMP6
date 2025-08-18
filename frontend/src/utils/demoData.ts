/**
 * Sample data for Quick Start Demo
 * Realistic but fictional employee data for demonstration purposes
 */

export interface DemoEmployee {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  hire_date: string;
  target_bonus_pct: number;
  calculated_bonus?: number;
}

export const demoEmployees: DemoEmployee[] = [
  {
    employee_id: "EMP001",
    first_name: "Sarah",
    last_name: "Johnson",
    email: "sarah.johnson@demotech.com",
    department: "Sales",
    position: "Senior Account Manager", 
    salary: 85000,
    hire_date: "2020-03-15",
    target_bonus_pct: 0.15,
    calculated_bonus: 12750
  },
  {
    employee_id: "EMP002", 
    first_name: "Michael",
    last_name: "Chen",
    email: "michael.chen@demotech.com",
    department: "Engineering",
    position: "Software Engineer",
    salary: 95000,
    hire_date: "2019-08-01",
    target_bonus_pct: 0.12,
    calculated_bonus: 11400
  },
  {
    employee_id: "EMP003",
    first_name: "Emily",
    last_name: "Rodriguez", 
    email: "emily.rodriguez@demotech.com",
    department: "Marketing",
    position: "Marketing Manager",
    salary: 78000,
    hire_date: "2021-01-10", 
    target_bonus_pct: 0.14,
    calculated_bonus: 10920
  },
  {
    employee_id: "EMP004",
    first_name: "James",
    last_name: "Williams",
    email: "james.williams@demotech.com", 
    department: "Finance",
    position: "Financial Analyst",
    salary: 72000,
    hire_date: "2022-06-01",
    target_bonus_pct: 0.10,
    calculated_bonus: 7200
  },
  {
    employee_id: "EMP005",
    first_name: "Lisa",
    last_name: "Thompson",
    email: "lisa.thompson@demotech.com",
    department: "Sales", 
    position: "Sales Director",
    salary: 120000,
    hire_date: "2018-04-20",
    target_bonus_pct: 0.20,
    calculated_bonus: 24000
  },
  {
    employee_id: "EMP006",
    first_name: "David",
    last_name: "Kim",
    email: "david.kim@demotech.com",
    department: "Engineering",
    position: "Principal Engineer", 
    salary: 130000,
    hire_date: "2017-09-12",
    target_bonus_pct: 0.15,
    calculated_bonus: 19500
  }
];

export const demoParameters = {
  fund_performance: 0.18,
  risk_adjustment_factor: 0.95,
  bonus_cap_percentage: 0.25,
  investment_weight: 0.70,
  qualitative_weight: 0.30,
  company_name: "DemoTech Solutions",
  calculation_date: "2024-01-15"
};

export const demoSummary = {
  total_employees: demoEmployees.length,
  total_salary: demoEmployees.reduce((sum, emp) => sum + emp.salary, 0),
  total_bonus_pool: demoEmployees.reduce((sum, emp) => sum + (emp.calculated_bonus || 0), 0),
  average_bonus: demoEmployees.reduce((sum, emp) => sum + (emp.calculated_bonus || 0), 0) / demoEmployees.length,
  departments: [...new Set(demoEmployees.map(emp => emp.department))],
  calculation_steps: [
    "1. Load employee data (6 employees)",
    "2. Set calculation parameters",
    "3. Apply bonus formulas", 
    "4. Generate results and summaries"
  ]
};

// Demo workflow steps for guided tour
export const demoWorkflowSteps = [
  {
    id: 1,
    title: "Upload Employee Data",
    description: "In real use, you'd upload your CSV file. For this demo, we've loaded 6 sample employees.",
    action: "View Sample Data",
    completed: false
  },
  {
    id: 2, 
    title: "Configure Parameters",
    description: "Set bonus calculation rules like performance factors and caps.",
    action: "Review Parameters",
    completed: false
  },
  {
    id: 3,
    title: "Calculate Bonuses",
    description: "Run the calculation engine to compute everyone's bonus amounts.",
    action: "Run Calculation", 
    completed: false
  },
  {
    id: 4,
    title: "Review Results",
    description: "See the results, charts, and export options.", 
    action: "View Results",
    completed: false
  }
];

export const demoMessages = {
  welcome: "Welcome to your 2-minute bonus calculator tour! We'll show you how easy it is using sample data.",
  step1: "Here's what your employee data looks like. Notice we have people from different departments with varying salaries.",
  step2: "These parameters control how bonuses are calculated. You can adjust these for different scenarios.", 
  step3: "The calculation happens instantly! Each employee's bonus is computed based on their salary and the parameters.",
  step4: "Here are your results! You can see individual bonuses, department summaries, and download reports.",
  completion: "That's it! In under 2 minutes, you calculated bonuses for 6 employees. Ready to try with your real data?"
};