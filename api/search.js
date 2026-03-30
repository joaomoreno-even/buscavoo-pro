export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { provider, ssKey, duffelKey, origin, dest, date, adults } = req.body;

  try {
    if (provider === "skyscrapper") {
      const headers = {
        "x-rapidapi-key": ssKey,
        "x-rapidapi-host": "sky-scrapper.p.rapidapi.com",
      };

      const [oRes, dRes] = await Promise.all([
        fetch(`https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport?query=${origin}&locale=en-US`, { headers }),
        fetch(`https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport?query=${dest}&locale=en-US`, { headers }),
      ]);

      const [oD, dD] = await Promise.all([oRes.json(), dRes.json()]);
      const oAirport = oD.data?.find(a => a.skyId === origin) || oD.data?.[0];
      const dAirport = dD.data?.find(a => a.skyId === dest) || dD.data?.[0];

      if (!oAirport || !dAirport) return res.status(400).json({ error: "Aeroporto não encontrado" });

      const flightRes = await fetch(
        `https://sky-scrapper.p.rapidapi.com/api/v2/flights/searchFlights?originSkyId=${oAirport.skyId}&destinationSkyId=${dAirport.skyId}&originEntityId=${oAirport.entityId}&destinationEntityId=${dAirport.entityId}&date=${date}&adults=${adults}&currency=BRL&locale=en-US&market=BR&cabinClass=economy`,
        { headers }
      );
      const data = await flightRes.json();
      return res.status(200).json(data);
    }

    if (provider === "duffel") {
      const r = await fetch("https://api.duffel.com/air/offer_requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Duffel-Version": "v2",
          "Authorization": `Bearer ${duffelKey}`,
        },
        body: JSON.stringify({
          data: {
            slices: [{ origin, destination: dest, departure_date: date }],
            passengers: Array(parseInt(adults)).fill({ type: "adult" }),
            cabin_class: "economy",
          },
        }),
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Provider inválido" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
