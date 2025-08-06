"use client";

import { useConvexAuth } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Github,
  Linkedin,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  Twitter,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import IDELanding from "@/components/ide-landing";
import Testimonials from "@/components/testimonials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  const { isAuthenticated } = useConvexAuth();

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.svg"
                alt="VAI"
                width={80}
                height={32}
                priority
                className="h-8 w-auto"
              />
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/members"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Members
              </Link>
              <Link
                href="/discord-digest"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Discord
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="hidden sm:inline-flex">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="container relative">
            <motion.div
              className="mx-auto max-w-4xl py-24 md:py-32 text-center"
              initial="initial"
              animate="animate"
              variants={stagger}
            >
              <motion.div variants={fadeIn} className="mb-6">
                <Badge variant="secondary" className="px-4 py-1.5">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Join 500+ AI Engineers
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeIn}
                className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
              >
                Where AI Engineers
                <span className="block text-primary">Level Up Together</span>
              </motion.h1>

              <motion.p
                variants={fadeIn}
                className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              >
                Cut through the noise. Join a curated community of AI engineers
                sharing real insights, vetted resources, and breakthrough
                discoveries.
              </motion.p>

              <motion.div
                variants={fadeIn}
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link href="/sign-up">
                  <Button size="lg" className="group">
                    Start Your Journey
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/members">
                  <Button size="lg" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Browse Community
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                variants={fadeIn}
                className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>No spam, ever</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Interactive IDE Demo */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">
                Experience the Community
              </h2>
              <p className="text-muted-foreground text-lg">
                See how our members collaborate and share knowledge
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <IDELanding />
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold mb-4">
                Why Engineers Choose VAI
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                We've built the community we wished existed when we started our
                AI journey
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-card rounded-2xl p-8 border hover:border-primary/50 transition-colors">
                    <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="text-4xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">What Members Say</h2>
              <p className="text-muted-foreground text-lg">
                Real feedback from our community
              </p>
            </motion.div>
            <Testimonials />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary/5">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl text-center"
            >
              <h2 className="text-3xl font-bold mb-6">
                Ready to Join the Future of AI Development?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Connect with engineers who are building the next generation of
                AI applications
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/sign-up">
                  <Button size="lg" className="group">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/discord-digest">
                  <Button size="lg" variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Preview Discord
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Image
                src="/logo.svg"
                alt="VAI"
                width={80}
                height={32}
                className="h-8 w-auto mb-4"
              />
              <p className="text-sm text-muted-foreground">
                A curated community for AI engineers to learn and grow together.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/members" className="hover:text-foreground">
                    Members
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-foreground">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/discord-digest"
                    className="hover:text-foreground"
                  >
                    Discord
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/prompts" className="hover:text-foreground">
                    Prompts
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-foreground">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    API Docs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Connect</h4>
              <div className="flex gap-4">
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Linkedin className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} VAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Zap,
    title: "Signal Over Noise",
    description:
      "Skip the endless scroll. Get curated insights from engineers who ship real AI products.",
  },
  {
    icon: Users,
    title: "Vetted Community",
    description:
      "Connect with verified AI engineers, researchers, and founders building the future.",
  },
  {
    icon: Code2,
    title: "Real Code, Real Results",
    description:
      "Share and discover production-ready code, not just theory and tutorials.",
  },
  {
    icon: MessageSquare,
    title: "Active Discord",
    description:
      "24/7 discussions, code reviews, and collaboration with engineers worldwide.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your data stays yours. No selling, no spam, just genuine connections.",
  },
  {
    icon: Star,
    title: "Weekly Digests",
    description:
      "Curated summaries of the best discussions, tools, and breakthroughs.",
  },
];

const stats = [
  { value: "500+", label: "Active Members" },
  { value: "1000+", label: "Code Snippets Shared" },
  { value: "50+", label: "Weekly Discussions" },
  { value: "4.9/5", label: "Member Rating" },
];
