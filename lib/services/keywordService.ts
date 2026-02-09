import { supabase } from '@/lib/supabase/client'

export interface KeywordRecord {
  id: string
  site_id: string
  keyword: string
  language: string
  location_code: number
  current_position: number | null
  previous_position: number | null
  search_volume: number | null
  keyword_difficulty: number | null
  last_checked_at: string | null
  created_at: string
}

export const keywordService = {
  // Get all keywords for a site
  async getKeywordsBySite(siteId: string): Promise<KeywordRecord[]> {
    const { data, error } = await supabase
      .from('keywords')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching keywords:', error)
      throw new Error(`Failed to fetch keywords: ${error.message}`)
    }

    return data || []
  },

  // Create new keyword
  async createKeyword(keyword: {
    site_id: string
    keyword: string
    language?: string
    location_code?: number
  }): Promise<KeywordRecord> {
    const { data, error } = await supabase
      .from('keywords')
      .insert({
        site_id: keyword.site_id,
        keyword: keyword.keyword,
        language: keyword.language || 'ru',
        location_code: keyword.location_code || 2643,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating keyword:', error)
      throw new Error(`Failed to create keyword: ${error.message}`)
    }

    return data
  },

  // Update keyword position
  async updateKeywordPosition(
    keywordId: string,
    position: number
  ): Promise<KeywordRecord> {
    // Get current position first
    const { data: current } = await supabase
      .from('keywords')
      .select('current_position')
      .eq('id', keywordId)
      .single()

    const { data, error } = await supabase
      .from('keywords')
      .update({
        previous_position: current?.current_position,
        current_position: position,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', keywordId)
      .select()
      .single()

    if (error) {
      console.error('Error updating keyword:', error)
      throw new Error(`Failed to update keyword: ${error.message}`)
    }

    return data
  },

  // Delete keyword
  async deleteKeyword(keywordId: string): Promise<void> {
    const { error } = await supabase
      .from('keywords')
      .delete()
      .eq('id', keywordId)

    if (error) {
      console.error('Error deleting keyword:', error)
      throw new Error(`Failed to delete keyword: ${error.message}`)
    }
  },
}
