defmodule Plausible.Stats.RecentEvents do
  @moduledoc """
  API for querying the most recent events for the live globe view.
  """

  use Plausible.ClickhouseRepo

  @allowed_minutes [1, 5, 30, 60, 360, 1440]
  @limit 100

  def allowed_minutes, do: @allowed_minutes

  def recent_events(site, minutes) when minutes in @allowed_minutes do
    now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)
    first_datetime = NaiveDateTime.shift(now, minute: -minutes)

    ClickhouseRepo.all(
      from e in "events_v2",
        where: ^Plausible.Sites.site_id_query_filter(site),
        where: e.timestamp >= ^first_datetime and e.timestamp <= ^now,
        where: e.name != "engagement",
        where: e.country_code != "",
        order_by: [desc: e.timestamp],
        limit: @limit,
        select: %{
          timestamp: e.timestamp,
          name: e.name,
          pathname: e.pathname,
          country_code: e.country_code,
          country_name: e.country_name,
          city_geoname_id: e.city_geoname_id,
          city_name: e.city_name,
          visitor_key: fragment("toString(cityHash64(?))", e.user_id)
        }
    )
  end
end
