import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import type {
  DashboardResponse,
  PatientDetailResponse,
  QueueInsightsResponse,
  RoundingListQuery,
} from "@smart-rounding/contracts";
import { ProviderService, type RoundingListPage } from "./provider.service.js";
import { Roles } from "../auth/auth.decorators.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";

@Controller("provider")
@Roles("PHYSICIAN", "NURSE_PRACTITIONER")
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get("dashboard")
  dashboard(): DashboardResponse {
    return this.providerService.dashboard();
  }

  @Get("rounding-list")
  roundingList(
    @Query() query: RoundingListQuery,
    @Req() request: AuthenticatedRequest,
  ): RoundingListPage {
    // RolesGuard already guarantees principal.role is PHYSICIAN or
    // NURSE_PRACTITIONER here; the scope always comes from the authenticated
    // principal, never from the query string.
    return this.providerService.roundingList(query, request.principal?.role);
  }

  @Get("queue-insights")
  queueInsights(): QueueInsightsResponse {
    return this.providerService.queueInsights();
  }

  @Get("patients/:id")
  patient(@Param("id") id: string): PatientDetailResponse {
    const patient = this.providerService.patient(id);
    if (!patient) throw new NotFoundException("Patient not found");
    return patient;
  }
}
