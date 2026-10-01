import { z } from 'zod';

import { ID_PATTERN } from '../ids.ts';
import { DateKeySchema, EntityStatusSchema, ImageRefSchema, RelationSchema } from './entity.ts';

const id = z.string().regex(ID_PATTERN, 'ids must be kebab-case');
const tagSchema = z.string().regex(ID_PATTERN, 'tags must be kebab-case');

/**
 * Frontmatter for a `lore/<type>/<id>.md` file. The SAME schema serves two
 * cases (brief §6's field-ownership rule): a non-spatial entity (person,
 * faction, event, ...), where most fields live here; or a spatial entity's
 * lore body, where frontmatter should hold little beyond `id`/`type` since
 * everything else already lives on the GeoJSON feature — scripts/validate.ts
 * rejects a field defined in both places, not this schema (which doesn't
 * know what a feature contains).
 */
export const LoreFrontmatterSchema = z.object({
  id,
  /** A registered entity type — spatial or non-spatial (checked against data/registry/entity-types.json by scripts/validate.ts). */
  type: id,
  name: z.string().min(1).optional(),
  aliases: z.array(z.string().min(1)).optional(),
  summary: z.string().min(1).optional(),
  tags: z.array(tagSchema).optional(),
  from: DateKeySchema.optional(),
  to: DateKeySchema.optional(),
  /** A single point in time — for `event`-type entities, which happen rather than span (brief §6). */
  date: DateKeySchema.optional(),
  relations: z.array(RelationSchema).optional(),
  status: EntityStatusSchema.default('canon'),
  /** Spatial entity id(s) this non-spatial entity should appear at on the map (brief §4.4/§6). */
  location: z.union([id, z.array(id)]).optional(),
  images: z.array(ImageRefSchema).optional(),
});

export type LoreFrontmatter = z.infer<typeof LoreFrontmatterSchema>;
