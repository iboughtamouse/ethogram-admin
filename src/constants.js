/** Wire values ↔ display labels shared across pages. */

export const OPTION_KIND_LABELS = {
  object: 'Objects',
  object_interaction: 'Object interactions',
  animal: 'Animals',
  animal_interaction: 'Animal interactions',
};

// Mirrors the api's subject_type enum (ethogram-api src/routes/adminWrite.ts)
export const SUBJECT_TYPES = ['foster_parent', 'juvenile', 'baby'];

export const SUBJECT_TYPE_LABELS = {
  foster_parent: 'Foster parent',
  juvenile: 'Juvenile',
  baby: 'Baby',
};

// The six behavior requires-flags, with the plain-language phrasing the
// design asks for ("needs a location?", design §5)
export const BEHAVIOR_FLAG_FIELDS = [
  ['requiresLocation', 'Needs a location'],
  ['requiresObject', 'Needs an object'],
  ['requiresObjectInteraction', 'Needs an object interaction type'],
  ['requiresAnimal', 'Needs an animal'],
  ['requiresAnimalInteraction', 'Needs an animal interaction type'],
  ['requiresDescription', 'Needs a description'],
];
