/**
 * Backend Module Barrel Export
 *
 * Single import point for all backend utilities.
 * Usage: import { ... } from "@/lib/backend"
 */

// Types
export type {
  TenantContext,
  ApiResponse,
  ApiError,
  PaginationMeta,
  PaginationParams,
  PaginatedResult,
  AuditContext,
  RealtimeEvent,
  AiContext,
  AiProviderAdapter,
  User,
  UserRole,
  Member,
  MemberStatus,
  AttendanceRecord,
  AttendanceMethod,
  Service,
  ServiceStatus,
  Group,
  Ministry,
  Event,
  FollowUp,
  ShepherdingRecord,
  PrayerRequest,
  AttendanceStatus,
  AttendanceException,
  AttendanceExceptionStatus,
  CheckInResult,
  FollowUpActivity,
  FollowUpStats,
  FollowUpStatus,
  FollowUpPriority,
  FollowUpType,
  FollowUpContactType,
  Family,
  FamilyMember,
  FamilyRelationship,
  FamilyRelationshipType,
  FamilyTree,
  FamilyTreeNode,
  CreateFamilyInput,
  UpdateFamilyInput,
  CreateFamilyRelationshipInput,
  UpdateFamilyRelationshipInput,
} from "./types";

// Errors
export {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  TenantError,
  toApiResponse,
} from "./errors";

// Validation
export {
  validate,
  paginationSchema,
  idParamSchema,
  createFamilySchema,
  updateFamilySchema,
  createFamilyRelationshipSchema,
  updateFamilyRelationshipSchema,
  familyQuerySchema,
} from "./validation";

// Authorization
export {
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requirePastor,
  requireLeader,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  hasPermission,
  validateTenantContext,
  requireOwnershipOrRole,
  getRoleLevel,
} from "./authorization";

// API Response Helpers
export {
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  errorResponse,
  withErrorHandling,
  withAuth,
  withPermission,
} from "./api-response";

// Services
export {
  BaseService,
  AttendanceService,
  attendanceService,
  AiService,
  aiService,
  registerAiProvider,
  FollowUpService,
  followUpService,
  FamilyService,
  familyService,
} from "./services";
