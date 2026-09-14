# Be sure to restart your server when you modify this file.

require Rails.root.join("lib/lab_cors")

Rails.application.config.middleware.insert_before 0, LabCors
