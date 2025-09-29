import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // This function only runs if the user is authenticated
    // You can add additional logic here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname

        // Allow access to audit leader rating pages (no auth required)
        if (path.startsWith('/audit/')) {
          return true
        }

        // Allow access to login page
        if (path === '/login') {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth routes)
     * - api/audit/leader (audit leader endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api/auth|api/audit/leader|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.mp4$).*)',
  ],
}