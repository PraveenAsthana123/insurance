// departments.js — Re-exports from /config/brand.config.json.
//
// DO NOT hand-edit the department list here. Edit /config/brand.config.json
// (single source of truth) and rebuild. See config/README.md.

import { rawDepartments } from '../config/brand';

export const departments = rawDepartments;
export default departments;
