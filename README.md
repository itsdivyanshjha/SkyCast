# SkyCast

SkyCast is a sleek and responsive weather forecast application built with Next.js and Tailwind CSS. It provides real-time weather data and a 5-day forecast for any location in the world.

## Features

-   **Current Weather:** Get up-to-the-minute weather information, including temperature, "feels like" temperature, humidity, wind speed, and more.
-   **5-Day Forecast:** Plan ahead with a detailed 5-day weather forecast.
-   **Search by Location:** Search for weather by city name, ZIP code, or geographic coordinates (latitude, longitude).
-   **Geolocation:** Use your current location to get instant weather data.
-   **Responsive Design:** A clean and modern UI that looks great on all devices.
-   **Error Handling:** Clear error messages for invalid locations or API issues.

## Components

The project is structured with the following key components:

-   `pages/index.tsx`: The main page of the application, which contains the UI and logic for fetching and displaying weather data.
-   `components/WeatherCard.tsx`: A component to display the current weather conditions.
-   `components/ForecastCard.tsx`: A component to display the weather forecast for a single day.
-   `utils/weatherApi.ts`: A utility module to handle API requests to the OpenWeatherMap API.
-   `types/weather.ts`: TypeScript type definitions for the weather data.

## Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

-   Node.js (v14 or later)
-   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/itsdivyanshjha/SkyCast
    cd skycast
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**

    This project requires an API key from [OpenWeatherMap](https://openweathermap.org/api).

    1.  Create a free account on OpenWeatherMap and get your API key.
    2.  Create a file named `.env.local` in the root of the project.
    3.  Add your API key to the `.env.local` file:
        ```
        NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweathermap_api_key
        ```

### Running the Application

Once the installation is complete, you can run the application with:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Use

1.  Enter a location (city, zip code, or coordinates) in the search bar and click "Search".
2.  Alternatively, click "Use Location" to allow the browser to access your current location for an instant forecast.
3.  The current weather and a 5-day forecast will be displayed.

## Built With

-   [Next.js](https://nextjs.org/) - React Framework
-   [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
-   [TypeScript](https://www.typescriptlang.org/) - Programming Language
-   [Axios](https://axios-http.com/) - Promise-based HTTP client
-   [OpenWeatherMap API](https://openweathermap.org/api) - Weather Data Provider