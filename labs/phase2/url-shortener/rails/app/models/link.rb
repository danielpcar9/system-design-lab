require "uri"

class Link < ApplicationRecord
  ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
  CODE_LENGTH = 7

  validates :url, presence: true, length: { maximum: 2_048 }
  validate :url_must_be_http
  validates :code, presence: true

  before_validation :assign_code, on: :create

  def self.mint_code
    Array.new(CODE_LENGTH) { ALPHABET[SecureRandom.random_number(ALPHABET.size)] }.join
  end

  def url_must_be_http
    parsed = URI.parse(url)
    return if parsed.host.present? && %w[http https].include?(parsed.scheme)

    errors.add(:url, "must be an absolute HTTP(S) URL")
  rescue URI::InvalidURIError
    errors.add(:url, "must be an absolute HTTP(S) URL")
  end

  private

  def assign_code
    self.code ||= self.class.mint_code
  end
end
