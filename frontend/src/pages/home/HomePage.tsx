"use client"

import Autoplay from "embla-carousel-autoplay"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

export default function HomePage() {
  const images = ["/images/image.png", "/images/bondiolalogo.JPG", "/images/bondiola3.jpg", "/images/bondiola4.jpg"]

  return (
    <div className="flex flex-col items-center min-h-screen p-2 gap-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">Boru, gestiona tus bondiolas</h1>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 3000,
            stopOnInteraction: true,
          }),
        ]}
        className="w-full max-w-xl"
      >
        <CarouselContent>
          {images.map((src, i) => (
            <CarouselItem key={i}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                <img
                  src={src || "/placeholder.svg"}
                  alt={`Imagen ${i + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}
