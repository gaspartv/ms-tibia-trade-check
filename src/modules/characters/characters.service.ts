import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { characters } from "../../db/schema.js";
import { CreateCharacterResponse, NewCharacter } from "./characters.types.js";

export async function createCharacter(
  data: NewCharacter
): Promise<CreateCharacterResponse> {
  try {
    // Verifica se já existe um character com esse email
    const existing = await db
      .select()
      .from(characters)
      .where(eq(characters.email, data.email))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "Email já cadastrado",
      };
    }

    // Insere o novo character
    const [newCharacter] = await db.insert(characters).values(data).returning();

    return {
      success: true,
      data: newCharacter,
    };
  } catch (error) {
    console.error("Erro ao criar character:", error);
    return {
      success: false,
      error: "Erro interno ao criar character",
    };
  }
}

export async function getCharacterByEmail(email: string) {
  const result = await db
    .select()
    .from(characters)
    .where(eq(characters.email, email))
    .limit(1);

  return result[0] ?? null;
}

export async function getAllCharacters() {
  return db.select().from(characters);
}
