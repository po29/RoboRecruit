export enum JobLevel {
  Intern = 'Intern',
  Junior = 'Junior',
  Mid = 'Mid',
  Senior = 'Senior',
  Staff = 'Staff',
  Principal = 'Principal',
  Lead = 'Lead',
  Manager = 'Manager',
}

export enum CompanyStage {
  Seed = 'Seed',
  SeriesA = 'Series A',
  SeriesB = 'Series B',
  SeriesC = 'Series C',
  SeriesD = 'Series D',
  SeriesE = 'Series E',
  Public = 'Public',
  Subsidiary = 'Subsidiary',
}

export enum ProblemDomain {
  HumanoidRobotics = 'Humanoid Robotics',
  MobileManipulation = 'Mobile Manipulation',
  AutonomousNav = 'Autonomous Navigation',
  DroneUAV = 'Drone / UAV',
  InspectionSensing = 'Inspection & Sensing',
  ManufacturingAuto = 'Manufacturing Automation',
  RoboticsFoundation = 'Robotics Foundation / AI',
  EmbodiedAI = 'Embodied AI',
  SafetyCollaboration = 'Safety & Collaboration',
}

export enum TechCategory {
  Language = 'Language',
  Framework = 'Framework',
  RoboticsOS = 'Robotics OS',
  ML = 'ML / AI',
  Simulation = 'Simulation',
  Cloud = 'Cloud',
  Hardware = 'Hardware',
  Perception = 'Perception',
  Controls = 'Controls',
  DevOps = 'DevOps',
}

export interface TechItem {
  name: string
  category: TechCategory
}

export interface Product {
  name: string
  description: string
  category: string
}

export interface Company {
  id: string
  name: string
  logo: string
  website: string
  founded: number
  hq: string
  stage: CompanyStage
  problems: ProblemDomain[]
  techStack: TechItem[]
  products: Product[]
  description: string
  jobCount: number
}

export interface Job {
  id: string
  companyId: string
  title: string
  level: JobLevel
  skills: string[]
  location: string
  remote: boolean
  postedDate: string
  url: string
}

export interface FilterState {
  domains: ProblemDomain[]
  technologies: string[]
  stages: CompanyStage[]
  hasOpenJobs: boolean
}

export interface GraphNode {
  id: string
  name: string
  group: ProblemDomain
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  sharedSkills: string[]
  weight: number
}
