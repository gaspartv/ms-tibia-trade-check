import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { characters } from "../../db/schema.js";

export type Character = InferSelectModel<typeof characters>;
export type NewCharacter = InferInsertModel<typeof characters>;

export interface CreateCharacterBody {
  name: string;
  email: string;
  password: string;
}

export interface CreateCharacterResponse {
  success: boolean;
  data?: Character;
  error?: string;
}
