defmodule Mix.Tasks.GenerateCitiesCoords do
  @moduledoc """
  Regenerates `priv/static/data/cities_coords.json`, a `geoname_id -> [latitude, longitude]`
  dictionary used by the live globe view to place city markers.

  The source is the GeoNames `cities15000` dump (cities with population above 15000).
  Pass a path to an already downloaded `cities15000.txt` to skip the download.

  Run `mix generate_cities_coords` manually; it is not verified by CI because it needs network access.
  """

  use Mix.Task

  @source_url "https://download.geonames.org/export/dump/cities15000.zip"
  @output_path "priv/static/data/cities_coords.json"

  @impl Mix.Task
  def run(args) do
    Application.ensure_all_started(:req)

    json =
      args
      |> source()
      |> String.split("\n", trim: true)
      |> Map.new(fn line ->
        [geoname_id, _name, _ascii_name, _alternate_names, latitude, longitude | _] =
          String.split(line, "\t")

        {geoname_id, [round_coordinate(latitude), round_coordinate(longitude)]}
      end)
      |> Jason.encode!()

    File.mkdir_p!(Path.dirname(@output_path))
    File.write!(@output_path, json)
    Mix.shell().info("Wrote #{byte_size(json)} bytes to #{@output_path}")
  end

  defp source([path]), do: File.read!(path)

  defp source([]) do
    %{status: 200, body: body} = Req.get!(@source_url, raw: true)
    {:ok, [{~c"cities15000.txt", content}]} = :zip.extract(body, [:memory])
    content
  end

  defp round_coordinate(value) do
    value
    |> String.to_float()
    |> Float.round(2)
  end
end
