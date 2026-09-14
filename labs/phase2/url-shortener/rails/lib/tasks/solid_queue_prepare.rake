namespace :solid_queue do
  desc "Create Solid Queue tables in the configured queue database when missing"
  task prepare: :environment do
    ActiveRecord::Base.connected_to(database: :queue, role: :writing) do
      connection = ActiveRecord::Base.connection

      unless connection.table_exists?("solid_queue_processes")
        load Rails.root.join("db/queue_schema.rb").to_s
        Rails.logger.info("Prepared Solid Queue schema")
      end
    end
  end
end
