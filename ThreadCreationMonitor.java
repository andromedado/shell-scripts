import org.openjdk.btrace.core.annotations.*;
import static org.openjdk.btrace.core.BTraceUtils.*;

@BTrace
public class ThreadCreationMonitor {

    @OnMethod(
        clazz = "java.util.concurrent.Executors$DefaultThreadFactory",
        method = "newThread",
        location = @Location(Kind.ENTRY)
    )
    public static void onNewThreadEntry2() {
        println(">>> DefaultThreadFactory.newThread() called!");
        jstack(15);
        println("-------------------------------------");
    }

    @OnMethod(
        clazz = "com.dibs.lib.mvc.controller.HealthcheckController",
        method = "run",
        type = "com.dibs.service.common.ServiceResponse(java.util.Map)",
        location = @Location(Kind.ENTRY)
    )
    public static void onRun() {
        println("HealthcheckController.run() called!");
        jstack(15);
        println("-------------------------------------");
    }

    // --- NEW PROBE: Monitor ThreadPoolExecutor.addWorker ---
    // This method has arguments (Runnable, boolean).
    // Use @AnyType for arguments to match any type/number of arguments,
    // or specify the exact signature if you know it (e.g., Runnable.class, boolean.class).
    @OnMethod(
        clazz = "java.util.concurrent.ThreadPoolExecutor",
        method = "addWorker",
        location = @Location(Kind.ENTRY)
    )
    public static void onAddWorker(@ProbeClassName String pcn, @ProbeMethodName String pmn) {
        println(">>> ThreadPoolExecutor.addWorker() called!");
        jstack(15);
        println("-------------------------------------");
    }

    // You can keep the Thread.<init> and Thread.start if you want,
    // but focus your testing on addWorker.
    // They are less likely to work if they didn't before.

    // @OnMethod(
    //     clazz = "com.dibs.ecom.data.DomainTransaction",
    //     method = "<init>",
    //     location = @Location(Kind.ENTRY)
    // )
    // public static void domainTransactionInit() {
    //     println(">>> NEW DomainTransaction CONSTRUCTED!");
    //     jstack();
    //     println("-------------------------------------");
    // }

    @OnMethod(
        clazz = "java.lang.Thread",
        method = "<init>",
        location = @Location(Kind.ENTRY)
    )
    public static void onThreadCreate() {
        println(">>> THREAD Created! ");
        jstack(15);
        println("-------------------------------------");
    }

    @OnMethod(
        clazz = "com.dibs.service.common.threads.DibsThreadFactory",
        method = "newThread",
        location = @Location(Kind.ENTRY)
    )
    public static void onDibsThreadFactoryNewThread() {
        println(">>> DibsThreadFactory.newThread() called!");
        jstack(15);
        println("-------------------------------------");
    }
}