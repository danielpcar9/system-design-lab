require "test_helper"

class LinksTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    LabIdempotency.reset!
  end

  test "creates a link with the shared flat contract" do
    post "/links", params: { url: "https://example.com/article" }, as: :json

    assert_response :created
    assert_equal "https://example.com/article", response.parsed_body["url"]
    assert response.parsed_body["code"].present?
    assert_nil response.parsed_body["error"]
  end

  test "accepts the nested Rails-shaped body" do
    post "/links", params: { link: { url: "https://example.com/article" } }, as: :json

    assert_response :created
    assert response.parsed_body["code"].present?
  end

  test "redirects a known link and enqueues analytics" do
    link = Link.create!(url: "https://example.com/article")

    assert_enqueued_with(job: RecordClick) do
      get "/r/#{link.code}"
    end

    assert_response :redirect
    assert_equal "https://example.com/article", response.headers["Location"]
  end

  test "rejects an invalid URL with the error envelope" do
    post "/links", params: { url: "not-a-url" }, as: :json

    assert_response :unprocessable_entity
    assert response.parsed_body["error"].present?
  end

  test "unknown code returns 404 error envelope" do
    get "/r/missing"

    assert_response :not_found
    assert_equal "link not found", response.parsed_body["error"]
  end

  test "exhausted code collisions return 409" do
    Link.create!(url: "https://example.com/a", code: "abc1234")
    Link.stub(:mint_code, "abc1234") do
      post "/links", params: { url: "https://example.com/b" }, as: :json
    end

    assert_response :conflict
    assert_equal "code already exists", response.parsed_body["error"]
  end

  test "idempotency key replays the same code" do
    headers = { "Idempotency-Key" => "create-1" }
    post "/links", params: { url: "https://example.com/once" }, as: :json, headers: headers
    first = response.parsed_body["code"]
    post "/links", params: { url: "https://example.com/once" }, as: :json, headers: headers

    assert_response :created
    assert_equal first, response.parsed_body["code"]
  end

  test "does not enqueue analytics on create" do
    assert_no_enqueued_jobs only: RecordClick do
      post "/links", params: { url: "https://example.com/article" }, as: :json
    end
  end

  test "health is ok" do
    get "/health"
    assert_response :success
    assert_equal "ok", response.parsed_body["status"]
  end
end
