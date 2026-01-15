export interface CoinsHistoryBody {
  email?: string;
  password?: string;
  sessionId?: string;
}

export interface CoinsHistoryCheckBody {
  sent_to: string;
  sent_by: string;
  amount_tibia_coins: number;
  timestamp: number;
}

export interface CoinsHistoryEntry {
  number: number;
  date: string;
  description: string;
  character: string;
  balance: number;
  coinType: "transferable" | "non-transferable";
}

export interface CoinsHistoryResult {
  success: boolean;
  entries: CoinsHistoryEntry[];
  totalEntries: number;
  error?: string;
}

export interface FlareSolverrCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface FlareSolverrResponse {
  status: string;
  message: string;
  solution?: {
    url: string;
    status: number;
    response: string;
    cookies: FlareSolverrCookie[];
    userAgent: string;
  };
}
