// Landing Engine — Template Seeder
// Run via API route or script to insert all built-in templates into the DB.

import { toDbRecord as cleanBlogRecord } from './clean-blog/index'
import { toDbRecord as productLaunchRecord } from './product-launch/index'
import { toDbRecord as agencyLandingRecord } from './agency-landing/index'

export function getAllBuiltinTemplates() {
  return [
    cleanBlogRecord(),
    productLaunchRecord(),
    agencyLandingRecord(),
  ]
}
