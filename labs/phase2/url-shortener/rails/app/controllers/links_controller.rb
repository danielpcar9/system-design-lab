class LinksController < ActionController::API
  def create
    link = Link.create!(link_params)
    RecordClick.perform_later(link.id, "created")
    render json: link.slice(:code, :url), status: :created
  rescue ActiveRecord::RecordInvalid => error
    render json: { error: error.message }, status: :unprocessable_entity
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "code already exists" }, status: :conflict
  end

  def redirect
    link = Link.find_by!(code: params[:code])
    RecordClick.perform_later(link.id, "redirect")
    redirect_to link.url, status: :found
  rescue ActiveRecord::RecordNotFound
    render json: { error: "link not found" }, status: :not_found
  end

  private

  def link_params
    params.expect(link: [:url])
  end
end
