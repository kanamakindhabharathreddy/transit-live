import json, urllib.request

url = "https://raw.githubusercontent.com/Vonter/bmtc-gtfs/main/raw/routes.json"
data = json.loads(urllib.request.urlopen(url).read())

route_map = {}
for r in data["data"]:
    routeno = r["routeno"]
    routeid = r["routeid"]
    if routeno.endswith(" UP"):
        key = routeno.replace(" UP", "").strip()
        route_map[key] = routeid

with open("public/data/route_id_map.json", "w") as f:
    json.dump(route_map, f, indent=2)

print(f"Done. {len(route_map)} routes mapped.")
