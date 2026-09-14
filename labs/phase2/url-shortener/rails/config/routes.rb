Rails.application.routes.draw do
  get "/health", to: "health#show"
  get "/ready", to: "health#ready"
  get "/up", to: "health#show"
  resources :links, only: [:create]
  get "/r/:code", to: "links#redirect"
end
