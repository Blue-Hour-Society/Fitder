import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Fitder" }] }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 py-12">
      <section className="text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight">About Fitder</h1>
        <p className="mt-4 text-xl text-muted-foreground">The future of personal training, powered by AI.</p>
      </section>
      
      <section className="space-y-4">
        <h2 className="font-display text-3xl font-bold">Our mission</h2>
        <p className="leading-relaxed text-muted-foreground">
          At Fitder, we believe that high-quality personal training should be accessible to everyone. 
          By combining human expertise with cutting-edge computer vision technology, we're building 
          a platform that helps people move better, train smarter, and reach their goals faster.
        </p>
      </section>
    </div>
  );
}
