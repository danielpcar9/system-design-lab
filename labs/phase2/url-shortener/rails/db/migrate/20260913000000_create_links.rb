class CreateLinks < ActiveRecord::Migration[8.0]
  def change
    create_table :links do |t|
      t.string :code, null: false
      t.text :url, null: false
      t.timestamps
    end
    add_index :links, :code, unique: true
  end
end
