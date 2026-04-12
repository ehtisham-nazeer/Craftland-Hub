import React, { useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Show, useUser } from "@clerk/react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useCreateCreatorApplication,
  useMyCreatorApplications,
  useGetCreatorMe,
  getMyCreatorApplicationsQueryKey,
} from "@workspace/api-client-react";
import { useImageUpload } from "@/hooks/useImageUpload";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserPlus, Star, AlertCircle, CheckCircle2, Clock, XCircle, Camera, Loader2 } from "lucide-react";

const REGIONS = [
  "Bangladesh", "India", "Indonesia", "LATAM", "MENA",
  "Pakistan", "Singapore", "Thailand", "US/Brazil", "Vietnam", "Other"
];

const formSchema = z.object({
  inGameName: z.string().min(2, "In-game name must be at least 2 characters"),
  region: z.string().min(1, "Region is required"),
  bio: z.string().max(500, "Bio must be under 500 characters").optional().or(z.literal("")),
  socialLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return (
    <Badge className="badge-approved flex items-center gap-1 font-semibold">
      <CheckCircle2 className="h-3 w-3" /> Approved
    </Badge>
  );
  if (status === "rejected") return (
    <Badge className="bg-destructive/20 text-destructive border-destructive/30 flex items-center gap-1">
      <XCircle className="h-3 w-3" /> Rejected
    </Badge>
  );
  return (
    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
      <Clock className="h-3 w-3" /> Pending Review
    </Badge>
  );
}

function CircularLogoUploader({
  preview,
  onFileSelected,
  isUploading,
}: {
  preview: string | null;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="relative group h-24 w-24 rounded-full overflow-hidden border-2 border-dashed border-primary/50 hover:border-primary transition-colors bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        aria-label="Upload creator logo"
      >
        {preview ? (
          <img src={preview} alt="Logo preview" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <Camera className="h-7 w-7 text-primary/60" />
            <span className="text-[10px] font-medium text-primary/60">Logo</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
      <p className="text-xs text-muted-foreground text-center">
        {isUploading ? "Uploading…" : "Tap to upload your creator logo"}
      </p>
    </div>
  );
}

export default function JoinCreator() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { data: myApplications, isLoading } = useMyCreatorApplications();
  const { data: activeCreatorProfile, isLoading: profileLoading } = useGetCreatorMe({
    enabled: !!user,
    staleTime: 30_000,
  } as Parameters<typeof useGetCreatorMe>[0]);
  const mutation = useCreateCreatorApplication();

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const { uploadFile, isUploading } = useImageUpload({
    onSuccess: (url: string) => {
      setLogoUrl(url);
      toast.success("Logo uploaded successfully");
    },
    onError: () => {
      toast.error("Logo upload failed", { description: "Please try again." });
    },
  });

  const handleFileSelected = async (file: File) => {
    const localPreview = URL.createObjectURL(file);
    setLogoPreview(localPreview);
    await uploadFile(file);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { inGameName: "", region: "", bio: "", socialLink: "" },
  });

  const hasPending = myApplications?.some((a) => a.status === "pending");
  // Only show "You're a Featured Creator!" if there is an active profile in the DB.
  // An approved application alone is not enough — the profile could have been deleted.
  const hasActiveProfile = !profileLoading && !!activeCreatorProfile;

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(
      {
        data: {
          inGameName: values.inGameName,
          region: values.region,
          bio: values.bio || undefined,
          socialLink: values.socialLink || undefined,
          logoUrl: logoUrl || undefined,
        } as Parameters<typeof mutation.mutate>[0]["data"],
      },
      {
        onSuccess: () => {
          toast.success("Application Submitted!", {
            description: "Your creator profile request has been sent for review.",
          });
          queryClient.invalidateQueries({ queryKey: getMyCreatorApplicationsQueryKey() });
          form.reset();
          setLogoPreview(null);
          setLogoUrl(null);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Something went wrong";
          toast.error("Submission Failed", { description: msg });
        },
      }
    );
  }

  return (
    <div className="container max-w-screen-lg mx-auto py-12 px-4 flex-1">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 mb-6">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Become a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Featured Creator
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Apply to have your creator profile displayed publicly on CraftLand Hub. Showcase your maps and grow your fanbase.
          </p>
        </div>

        <Show when="signed-out">
          <Card className="max-w-lg mx-auto bg-card border-border/50">
            <CardContent className="pt-8 pb-8 text-center">
              <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Sign in to Apply</h3>
              <p className="text-muted-foreground mb-6">You need to be signed in to submit a creator application.</p>
              <Button asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </Show>

        <Show when="signed-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {hasActiveProfile ? (
                <Card className="bg-card border-green-500/30">
                  <CardContent className="pt-8 pb-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2 text-green-400">You're a Featured Creator!</h3>
                    <p className="text-muted-foreground mb-6">
                      Your creator profile for <strong className="text-foreground">{activeCreatorProfile?.name}</strong> is already live on CraftLand Hub.
                    </p>
                    <Button asChild variant="outline">
                      <Link href="/creators">View Creators Page</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl">Creator Application</CardTitle>
                    <CardDescription>
                      Fill out your details below. After submission, our team will review your profile shortly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasPending && (
                      <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <AlertTitle className="text-amber-400">Application Pending</AlertTitle>
                        <AlertDescription className="text-muted-foreground">
                          You already have a pending application. Please wait for the team to review it.
                        </AlertDescription>
                      </Alert>
                    )}

                    <CircularLogoUploader
                      preview={logoPreview}
                      onFileSelected={handleFileSelected}
                      isUploading={isUploading}
                    />

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="inGameName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>In-Game Creator Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Your exact Free Fire creator name" {...field} />
                              </FormControl>
                              <FormDescription>This must match your in-game name exactly.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Server Region *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select your region" />
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

                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell the community about yourself and your maps..."
                                  className="min-h-[100px] resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>Max 500 characters.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="socialLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Social / YouTube Link (Optional)</FormLabel>
                              <FormControl>
                                <Input type="url" placeholder="https://youtube.com/@yourchannel" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full btn-glow bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 font-bold"
                          disabled={mutation.isPending || hasPending || isUploading}
                        >
                          {mutation.isPending ? "Submitting…" : isUploading ? "Uploading logo…" : "Submit Application"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    What You Get
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Public profile with your logo & bio</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    <span>All your maps linked to your creator profile</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Fans can follow you for updates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Appear in leaderboards</span>
                  </div>
                </CardContent>
              </Card>

              {myApplications && myApplications.length > 0 && (
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">My Applications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {myApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{app.inGameName}</span>
                        <StatusBadge status={app.status} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </Show>
      </motion.div>
    </div>
  );
}
