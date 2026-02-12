import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type BackgroundTaskStatus = 'queued' | 'running' | 'completed' | 'failed'

export type BackgroundTaskType =
  | 'deep_analysis'
  | 'article_generation'
  | 'image_generation'
  | 'keyword_fetch'
  | 'competitor_discover'
  | 'content_pipeline'
  | 'onpage_crawl'
  | 'bulk_generate'

export interface BackgroundTask {
  id: string
  user_id: string
  task_type: BackgroundTaskType
  title: string
  status: BackgroundTaskStatus
  progress: number
  result: Record<string, any> | null
  error: string | null
  metadata: Record<string, any>
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export async function createBackgroundTask(
  userId: string,
  taskType: BackgroundTaskType,
  title: string,
  metadata: Record<string, any> = {}
): Promise<string> {
  const { data, error } = await supabase
    .from('background_tasks')
    .insert({
      user_id: userId,
      task_type: taskType,
      title,
      status: 'queued',
      progress: 0,
      metadata,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create background task: ${error.message}`)
  return data.id
}

export async function startTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('background_tasks')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw new Error(`Failed to start task: ${error.message}`)
}

export async function updateTaskProgress(taskId: string, progress: number): Promise<void> {
  const { error } = await supabase
    .from('background_tasks')
    .update({ progress: Math.min(100, Math.max(0, progress)) })
    .eq('id', taskId)

  if (error) throw new Error(`Failed to update task progress: ${error.message}`)
}

export async function completeTask(taskId: string, result: Record<string, any> = {}): Promise<void> {
  const { error } = await supabase
    .from('background_tasks')
    .update({
      status: 'completed',
      progress: 100,
      result,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) throw new Error(`Failed to complete task: ${error.message}`)
}

export async function failTask(taskId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('background_tasks')
    .update({
      status: 'failed',
      error: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) throw new Error(`Failed to fail task: ${error.message}`)
}
