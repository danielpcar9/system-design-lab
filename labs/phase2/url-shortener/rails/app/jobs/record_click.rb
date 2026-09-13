class RecordClick < ApplicationJob
  queue_as :analytics

  def perform(link_id, event)
    Rails.logger.info(event: event, link_id: link_id)
  end
end
