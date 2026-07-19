import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResearchFeed } from '@/components/research/ResearchFeed';
import { TrendingRepos } from '@/components/github/TrendingRepos';

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Tabs defaultValue="papers">
        <TabsList className="mb-4">
          <TabsTrigger value="papers">ArXiv Papers</TabsTrigger>
          <TabsTrigger value="github">GitHub Trending</TabsTrigger>
        </TabsList>
        <TabsContent value="papers">
          <ResearchFeed />
        </TabsContent>
        <TabsContent value="github">
          <TrendingRepos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
