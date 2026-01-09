export { charactersRoutes } from "./characters.routes.js";
export {
  createCharacter,
  getAllCharacters,
  getCharacterByEmail,
} from "./characters.service.js";
export type {
  Character,
  CreateCharacterBody,
  CreateCharacterResponse,
  NewCharacter,
} from "./characters.types.js";
