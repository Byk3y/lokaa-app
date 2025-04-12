
export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Lokaa has completely transformed how I engage with my community. The local payment options make monetization so much easier in Nigeria.",
      author: "Chioma Eze",
      role: "Creator & Educator",
      image: "/lovable-uploads/5fe2cfc4-40d9-4f85-b651-dae0f5632a18.png"
    },
    {
      quote: "Finally a platform that understands the needs of Latin American creators. The low data usage and offline features are game-changers for my audience.",
      author: "Miguel Herrera",
      role: "Course Creator",
      image: "/lovable-uploads/15f70142-ec8b-4298-923e-d46965348ec0.png"
    },
    {
      quote: "The ability to accept M-Pesa payments directly has boosted my course sales by 300%. My Kenyan audience loves the seamless experience.",
      author: "Grace Mbeki",
      role: "Community Leader",
      image: "/lovable-uploads/5b07ed39-9957-469b-b609-ca73d29ddd50.png"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Loved by creators worldwide</h2>
          <p className="text-xl text-gray-600">
            See how creators in emerging markets are using Lokaa to build thriving communities.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center mb-4">
                <div className="text-lokaa-600">
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i}
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 inline fill-current" 
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              
              <blockquote className="mb-6 text-gray-700 italic">"{testimonial.quote}"</blockquote>
              
              <div className="flex items-center">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.author} 
                  className="h-12 w-12 rounded-full object-cover mr-4"
                />
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
