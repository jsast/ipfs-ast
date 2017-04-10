require "net/http"
require "json"

class Visualizer
  def initialize(hash)
    @root = hash
    @nodes = {}
    @links = []

    add_object(hash)
  end

  def object_path(hash)
    "/api/v0/object/get?arg=" + hash
  end

  def get_object(hash)
    JSON.parse(Net::HTTP.get("localhost", object_path(hash), 5001))
  end

  def add_object(hash)
    unless @nodes.has_key?(hash)
      json = get_object(hash)
      @nodes[hash] = hash + "\\n" + json["Data"].to_json[1..-2]
      #hash #@g.add_nodes(hash, label: "\"" + hash + json["Data"].to_json + "\"")
      #@nodes[hash] = @g.add_nodes(hash, label: hash)

      json["Links"].each do |link|
        link_hash = link["Hash"]
        add_object(link_hash)
        @links << [hash, link_hash, link["Name"]]
      end
    end
  end

  def write(filename)
    puts "Nodes: #{@nodes.size}"
    puts "Links: #{@links.size}"
    File.open(filename, "w") do |file|
      file.puts "digraph #{@root} {"
      @nodes.each do |key, value|
        file.puts "#{key} [label=\"#{value}\"]"
      end

      @links.each do |from, to, label|
        file.puts "#{from} -> #{to} [label=\"#{label}\"];"
      end
      file.puts "}"
    end
  end
end

hash = ARGV[0]

v = Visualizer.new(hash)
v.write("output.dot")
