require "uri"

class Link < ApplicationRecord
  validates :url, presence: true, length: { maximum: 2_048 }
  validate :url_must_be_http
  validates :code, presence: true, uniqueness: true

  before_validation :assign_code, on: :create

  def url_must_be_http
    parsed = URI.parse(url)
    return if parsed.host.present? && %w[http https].include?(parsed.scheme)

    errors.add(:url, "must be an absolute HTTP(S) URL")
  rescue URI::InvalidURIError
    errors.add(:url, "must be an absolute HTTP(S) URL")
  end

  private

  def assign_code
    self.code ||= SecureRandom.urlsafe_base64(5).delete("-_=").first(7)
  end
end
