/**
 * Summary DTOs
 * Data Transfer Objects for summary endpoints
 */

export interface GenerateSummaryRequestDto {
  lengthPref?: 'short' | 'medium' | 'long';
}

export interface GenerateSummaryResponseDto {
  summaryId: string;
  sessionId: string;
  content: string;
  keyPoints: string[];
  lengthPref: 'short' | 'medium' | 'long';
  createdAt: string;
}

export interface SummaryDto {
  summaryId: string;
  sessionId: string;
  userId: string;
  content: string;
  keyPoints: string[];
  lengthPref: 'short' | 'medium' | 'long';
  createdAt: string;
}
