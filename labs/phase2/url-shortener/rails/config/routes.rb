Rails.application.routes.draw do
  resources :links, only: [:create]
  get "/r/:code", to: "links#redirect"
end
