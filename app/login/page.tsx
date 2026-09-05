import { login, signup } from './actions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
            RazeRevenue
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your merchant account or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            {params?.message && (
              <p className="text-sm text-red-500 text-center">
                {params.message}
              </p>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Button formAction={login} className="w-full bg-indigo-600 hover:bg-indigo-700">
                Sign In
              </Button>
              <Button formAction={signup} variant="outline" className="w-full">
                Create Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
