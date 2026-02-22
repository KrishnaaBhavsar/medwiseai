import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Scan,
  Recycle,
  Pill,
  Upload,
  Shield,
  Languages,
  Heart,
  CheckCircle,
  ArrowRight,
  Stethoscope
} from "lucide-react";

export default function Index() {
  const features = [
    {
      icon: FileText,
      title: "Prescription & Report Summarizer",
      description: "Upload prescriptions or lab reports and get AI-powered explanations in simple language.",
      link: "/prescription-analyzer"
    },
    {
      icon: Scan,
      title: "Medicine Strip Scanner",
      description: "Scan medicine strips with OCR technology to extract expiry dates and dosage information.",
      link: "/strip-scanner"
    },
    {
      icon: Recycle,
      title: "Donate or Dispose Flow",
      description: "Get guidance on safely disposing expired medicines or donating unused ones responsibly.",
      link: "/donate-dispose"
    },
    {
      icon: Pill,
      title: "OTC Suggestions",
      description: "Receive AI-powered over-the-counter medicine recommendations for common ailments.",
      link: "/otc-suggestions"
    }
  ];

  const benefits = [
    "Understand prescriptions in simple language",
    "Reduce medicine wastage and environmental impact",
    "Get safe disposal guidance for expired medicines",
    "Access basic health education and OTC recommendations",
    "Support for multiple languages including Hindi"
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary/10 p-3 rounded-full mr-3">
                <Stethoscope className="h-8 w-8 text-primary" />
              </div>
              <Badge variant="secondary" className="text-sm font-medium">
                HealthTech • AI-Powered • Sustainable
              </Badge>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Your Personal GenAI{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                Health Assistant
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              MedWise AI helps you understand prescriptions, manage medicines responsibly,
              and make informed healthcare decisions — bringing health literacy and sustainability together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/prescription-analyzer">
                  Start Analyzing <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Comprehensive Healthcare Solutions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From understanding complex medical reports to responsible medicine management,
              our AI-powered tools make healthcare more accessible and sustainable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50">
                <CardHeader className="pb-4">
                  <div className="bg-primary/10 p-3 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground mb-4">
                    {feature.description}
                  </CardDescription>
                  <Button asChild variant="ghost" className="p-0 h-auto text-primary hover:text-primary/80">
                    <Link to={feature.link}>
                      Try it now <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Why Choose MedWise AI?
              </h2>
              <p className="text-lg text-muted-foreground">
                Empowering healthier decisions with AI-driven insights and sustainable practices.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-success mt-1 flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-2xl">
                <div className="text-center">
                  <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    Making Healthcare Accessible
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Breaking down complex medical information into understandable insights
                    while promoting sustainable medicine management practices.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">100K+</div>
                      <div className="text-sm text-muted-foreground">Reports Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">95%</div>
                      <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your Healthcare Experience?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of users who trust MedWise AI for smarter healthcare decisions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/prescription-analyzer">
                  Upload Your First Prescription
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link to="/strip-scanner">
                  Scan Medicine Strip
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-success" />
                HIPAA Compliant
              </div>
              <div className="flex items-center">
                <Languages className="h-4 w-4 mr-2 text-info" />
                Multi-language Support
              </div>
              <div className="flex items-center">
                <Upload className="h-4 w-4 mr-2 text-warning" />
                Secure File Processing
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
