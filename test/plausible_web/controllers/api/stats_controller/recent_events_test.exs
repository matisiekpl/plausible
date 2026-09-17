defmodule PlausibleWeb.Api.StatsController.RecentEventsTest do
  use PlausibleWeb.ConnCase

  describe "GET /api/stats/:domain/recent-events" do
    setup [:create_user, :log_in, :create_site]

    test "returns pageviews from the last 5 minutes ordered by newest", %{conn: conn, site: site} do
      now = DateTime.utc_now()

      populate_stats(site, [
        build(:pageview,
          user_id: 123,
          pathname: "/old",
          timestamp: now |> DateTime.shift(minute: -3),
          country_code: "EE",
          city_geoname_id: 588_409
        ),
        build(:pageview,
          user_id: 456,
          pathname: "/new",
          timestamp: now |> DateTime.shift(minute: -1),
          country_code: "PL",
          city_geoname_id: 756_135
        ),
        build(:pageview, user_id: 789, timestamp: now |> DateTime.shift(minute: -7)),
        build(:pageview, user_id: 111, timestamp: now |> DateTime.shift(minute: 2)),
        build(:pageview,
          user_id: 999,
          timestamp: now |> DateTime.shift(minute: -2),
          country_code: ""
        ),
        build(:engagement, user_id: 789, timestamp: now |> DateTime.shift(minute: -2))
      ])

      conn = get(conn, "/api/stats/#{site.domain}/recent-events")

      assert [
               %{
                 "pathname" => "/new",
                 "country_code" => "PL",
                 "country_name" => "Poland",
                 "city_geoname_id" => 756_135,
                 "city_name" => "Warsaw",
                 "name" => "pageview",
                 "visitor_key" => visitor_key
               },
               %{"pathname" => "/old", "city_name" => "Tallinn", "country_name" => "Estonia"}
             ] = json_response(conn, 200)

      assert is_binary(visitor_key)
    end

    test "widens the window with minutes param", %{conn: conn, site: site} do
      now = DateTime.utc_now()

      populate_stats(site, [
        build(:pageview,
          user_id: 789,
          timestamp: now |> DateTime.shift(minute: -7),
          country_code: "EE"
        )
      ])

      conn = get(conn, "/api/stats/#{site.domain}/recent-events?minutes=30")

      assert [_] = json_response(conn, 200)
    end

    test "rejects unsupported minutes", %{conn: conn, site: site} do
      conn = get(conn, "/api/stats/#{site.domain}/recent-events?minutes=7")

      assert json_response(conn, 400)
    end

    test "works with shared link auth", %{site: site} do
      link = insert(:shared_link, site: site)

      conn = get(build_conn(), "/api/stats/#{site.domain}/recent-events?auth=#{link.slug}")

      assert json_response(conn, 200) == []
    end
  end
end
