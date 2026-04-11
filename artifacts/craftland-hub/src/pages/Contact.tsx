import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSendContactMessage } from "@workspace/api-client-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Send } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  message: z.string().min(10, "Message must be at least 10 characters")
});

export default function Contact() {
  const mutation = useSendContactMessage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Message Sent", { description: "Thanks for reaching out! We'll get back to you soon." });
        form.reset();
      },
      onError: () => {
        toast.error("Error", { description: "Failed to send message. Please try again." });
      }
    });
  }

  return (
    <div className="container max-w-screen-xl mx-auto py-12 px-4 flex-1">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Have a question, suggestion, or issue? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
        <div>
          <Card className="bg-card border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MessageSquare className="h-6 w-6 text-primary" />
                Send a Message
              </CardTitle>
              <CardDescription>Fill out the form below and we'll reply via email.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input placeholder="Your name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="How can we help?" className="min-h-[120px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? "Sending..." : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div className="bg-card/50 border border-border/50 p-8 rounded-2xl">
            <div className="bg-[#25D366]/20 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <FaWhatsapp className="h-8 w-8 text-[#25D366]" />
            </div>
            <h3 className="text-2xl font-bold mb-2">WhatsApp Channel</h3>
            <p className="text-muted-foreground mb-6">
              Join our official WhatsApp channel for the latest updates, featured maps, and community news.
            </p>
            <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" asChild>
              <a href="https://whatsapp.com/channel/0029VaFurLDD8SE2bbOUxy1L" target="_blank" rel="noopener noreferrer">
                Join Channel
              </a>
            </Button>
          </div>

          <div className="bg-card/50 border border-border/50 p-8 rounded-2xl">
            <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Direct Email</h3>
            <p className="text-muted-foreground mb-6">
              For business inquiries, partnerships, or urgent support, email us directly.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:ehtishamnazeeer@gmail.com">ehtishamnazeeer@gmail.com</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
