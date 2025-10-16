export default function HomePage() {
  return (
    <div className="flex gap-4 p-4">
      <img
        src="/images/image.png"
        alt="BondiolaPiola"
        className="rounded-2xl w-64 transition-transform duration-300 hover:scale-110 hover:rotate-1"
      />
      <img
        src="/images/image.png"
        alt="BondiolaPiola"
        width={400}
        className="rounded-2xl transition-transform duration-300 hover:scale-110 hover:-rotate-1"
      />
    </div>
  )
}
