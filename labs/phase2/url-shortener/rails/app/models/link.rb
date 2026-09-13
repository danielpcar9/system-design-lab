class Link < ApplicationRecord
  validates :url, presence: true, length: { maximum: 2_048 }
  validates :code, presence: true, uniqueness: true

  before_validation :assign_code, on: :create

  private

  def assign_code
    self.code ||= SecureRandom.urlsafe_base64(5).delete("-_=").first(7)
  end
end
