require "test_helper"

class LinksTest < ActionDispatch::IntegrationTest
  test "creates a link with the shared contract" do
    post "/links", params: { link: { url: "https://example.com/article" } }, as: :json

    assert_response :created
    assert_equal "https://example.com/article", response.parsed_body["url"]
    assert response.parsed_body["code"].present?
  end

  test "redirects a known link" do
    link = Link.create!(url: "https://example.com/article")

    get "/r/#{link.code}"

    assert_response :redirect
    assert_equal "https://example.com/article", response.headers["Location"]
  end
end
