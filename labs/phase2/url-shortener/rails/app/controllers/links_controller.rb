class LinksController < ActionController::API
  MAX_CODE_TRIES = 5

  def create
    LabFaults.delay!
    return render_postgres_fault if LabFaults.postgres_down?

    key = request.headers["Idempotency-Key"].presence
    if key && (replay = LabIdempotency.get(key))
      return render json: replay, status: :created
    end

    MAX_CODE_TRIES.times do
      link = Link.new(url: link_url)
      begin
        link.save!
        LabCache.write(link)
        payload = link.slice(:code, :url)
        LabIdempotency.put(key, payload) if key
        return render json: payload, status: :created
      rescue ActiveRecord::RecordNotUnique
        next
      rescue ActiveRecord::RecordInvalid => error
        return render json: { error: error.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
      end
    end

    render json: { error: "code already exists" }, status: :conflict
  rescue ActionController::ParameterMissing
    render json: { error: "url is required" }, status: :unprocessable_entity
  end

  def redirect
    LabFaults.delay!
    return render_postgres_fault if LabFaults.postgres_down?

    cached = LabCache.read(params[:code])
    if cached
      RecordClick.perform_later(cached["id"], "redirect") if cached["id"] && !LabFaults.worker_down?
      return redirect_to cached["url"], status: :found, allow_other_host: true
    end

    link = Link.find_by!(code: params[:code])
    LabCache.write(link)
    RecordClick.perform_later(link.id, "redirect") unless LabFaults.worker_down?
    redirect_to link.url, status: :found, allow_other_host: true
  rescue ActiveRecord::RecordNotFound
    render json: { error: "link not found" }, status: :not_found
  end

  private

  def link_url
    raw = params.permit(:url, link: [:url])
    url = raw[:url].presence || raw.dig(:link, :url)
    raise ActionController::ParameterMissing, :url if url.blank?

    url
  end

  def render_postgres_fault
    render json: { error: "storage unavailable" }, status: :service_unavailable
  end
end
