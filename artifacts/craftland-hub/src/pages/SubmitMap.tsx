import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateSubmission, useGetCreatorMe } from "@workspace/api-client-react";
import { toast } from "@/lib/toast";
import { useImageUpload } from "@/hooks/useImageUpload";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, AlertCircle, ImageIcon, X, Loader2, Lock, LogIn, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const REGIONS = [
  "Bangladesh", "India", "Indonesia", "LATAM", "MENA", 
  "Pakistan", "Singapore", "Thailand", "US/Brazil", "Vietnam", "Other"
];

const formSchema = z.object({
  creatorName: z.string().min(2, "Creator name must be at least 2 characters"),
  region: z.string().min(1, "Region is required"),
  mapCode: z.string().min(1, "Map code is required"),
  mapName: z.string().min(3, "Map name must be at least 3 characters"),
  mapLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  image: z.string().optional().or(z.literal(""))
});

export default function SubmitMap() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const createMutation = useCreateSubmission();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);

  const { data: creatorProfile } = useGetCreatorMe({
    enabled: !!user,
    staleTime: 60_000,
  } as Parameters<typeof useGetCreatorMe>[0]);

  const { uploadFile, isUploading, progress } = useImageUpload({
    onSuccess: (url: string) => {
      setUploadedPath(url);
      form.setValue("image", url);
    },
    onError: (err: Error) => {
      toast.error("Image Upload Failed", { description: err.message });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      creatorName: "",
      region: "",
      mapCode: "",
      mapName: "",
      mapLink: "",
      image: ""
    },
  });

  useEffect(() => {
    if (creatorProfile?.name) {
      form.setValue("creatorName", creatorProfile.name, { shouldValidate: true });
    }
  }, [creatorProfile?.name, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Map Submitted!", {
          description: "Your map is pending review. It'll go live once approved by our team.",
        });
        setLocation("/profile");
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "There was an error submitting your map.";
        toast.error("Submission Failed", { description: message });
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", { description: "Please select an image file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    void uploadFile(file);
  }

  function clearImage() {
    setImagePreview(null);
    setUploadedPath(null);
    form.setValue("image", "");
  }

  return (
    <div className="container max-w-screen-md mx-auto py-12 px-4 flex-1">
      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="relative mb-6">
            <div className="h-20 w-20 rounded-full bg-card border border-white/10 flex items-center justify-center mx-auto shadow-xl">
              <UploadCloud className="h-9 w-9 text-primary" />
            </div>
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl mx-auto" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Sign in to submit a map</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8 leading-relaxed">
            Create a free account or sign in to share your Free Fire CraftLand maps with the community.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mx-auto">
            <Button
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-semibold btn-glow rounded-xl gap-2"
              onClick={() => setLocation("/sign-in")}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 border-white/12 hover:bg-white/6 rounded-xl gap-2 font-semibold"
              onClick={() => setLocation("/sign-up")}
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Button>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <UploadCloud className="h-8 w-8 text-primary" />
            Submit Your Map
          </h1>
          <p className="text-muted-foreground">
            Share your Free Fire CraftLand creation with the global community.
          </p>
        </div>

        <Alert className="mb-8 bg-card border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Review Process</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            All maps are manually reviewed before being published to ensure quality and prevent spam. Your map will go live shortly after team review.
          </AlertDescription>
        </Alert>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Map Details</CardTitle>
            <CardDescription>Fill out the information exactly as it appears in-game.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="mapName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Map Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1v1 Ultimate Aim" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mapCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Map Code <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="#FREEFIRE..." {...field} className="font-mono text-sm" />
                        </FormControl>
                        <FormDescription>The exact share code from the game</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="creatorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          In-Game Creator Name <span className="text-destructive">*</span>
                          {creatorProfile && (
                            <Badge variant="secondary" className="ml-1 gap-1 text-xs font-normal">
                              <Lock className="h-3 w-3" /> Locked
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your FF Username"
                            {...field}
                            readOnly={!!creatorProfile}
                            className={creatorProfile ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
                          />
                        </FormControl>
                        {creatorProfile ? (
                          <FormDescription className="text-xs text-green-500/80">
                            Auto-filled from your approved creator profile. This field cannot be changed.
                          </FormDescription>
                        ) : (
                          <FormMessage />
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Region <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your server region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REGIONS.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Cover Image
                  </label>
                  <div className="space-y-3">
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30">
                        <img
                          src={imagePreview}
                          alt="Map preview"
                          className="w-full h-48 object-cover"
                        />
                        {isUploading && (
                          <div className="absolute inset-0 bg-background/70 flex items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm font-medium">{progress}%</span>
                          </div>
                        )}
                        {uploadedPath && !isUploading && (
                          <div className="absolute top-2 right-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-full"
                              onClick={clearImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
                        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload a screenshot</span>
                        <span className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WebP up to 10MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                    {!imagePreview && (
                      <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Or paste an image URL (Imgur, Discord, etc)" {...field} />
                            </FormControl>
                            <FormDescription>Upload a file above or paste a direct image link</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="mapLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Play Link (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>Direct launch link if available</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={createMutation.isPending || isUploading}>
                  {isUploading ? "Uploading image..." : createMutation.isPending ? "Submitting..." : "Submit Map for Review"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </Show>
    </div>
  );
}
