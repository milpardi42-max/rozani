export default function RootPage() {
  return (
    <main>
      <script dangerouslySetInnerHTML={{ __html: "location.replace('./fa/')" }} />
      <p>
        <a href="./fa/">Rosie Atelier</a>
      </p>
    </main>
  );
}